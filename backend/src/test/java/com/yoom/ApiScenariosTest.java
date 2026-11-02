package com.yoom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yoom.auth.User;
import com.yoom.auth.UserRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

/**
 * End-to-end API scenarios through the real Spring context and security chain.
 * MongoDB is replaced by an in-memory UserRepository so no database is needed.
 */
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration",
        "yoom.jwt.secret=test-jwt-secret-that-is-at-least-32-characters",
        "yoom.jwt.expiration=7d",
        "yoom.stream.api-key=test-stream-key",
        "yoom.stream.api-secret=" + ApiScenariosTest.STREAM_SECRET,
        "yoom.cors.allowed-origins=http://localhost:3000",
})
@AutoConfigureMockMvc
class ApiScenariosTest {

    static final String STREAM_SECRET = "test-stream-secret-that-is-long-enough-for-hs256";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @MockitoBean
    private UserRepository userRepository;

    private final Map<String, User> users = new ConcurrentHashMap<>();

    @BeforeEach
    void inMemoryUserStore() {
        users.clear();

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) {
                ReflectionTestUtils.setField(user, "id", UUID.randomUUID().toString().replace("-", ""));
            }
            users.put(user.getId(), user);
            return user;
        });
        when(userRepository.findById(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(users.get(invocation.<String>getArgument(0))));
        when(userRepository.findByUsername(anyString())).thenAnswer(invocation -> users.values().stream()
                .filter(u -> u.getUsername().equals(invocation.getArgument(0))).findFirst());
        when(userRepository.findByEmail(anyString())).thenAnswer(invocation -> users.values().stream()
                .filter(u -> u.getEmail().equals(invocation.getArgument(0))).findFirst());
        when(userRepository.existsByUsername(anyString())).thenAnswer(invocation -> users.values().stream()
                .anyMatch(u -> u.getUsername().equals(invocation.getArgument(0))));
        when(userRepository.existsByEmail(anyString())).thenAnswer(invocation -> users.values().stream()
                .anyMatch(u -> u.getEmail().equals(invocation.getArgument(0))));
    }

    private JsonNode signUp(String username, String email, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/sign-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "username", username, "email", email, "password", password))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return json.readTree(body);
    }

    private String toJson(Object body) throws Exception {
        return json.writeValueAsString(body);
    }

    @Nested
    class SignUp {

        @Test
        void createsUserAndReturnsTokenWithNormalizedFields() throws Exception {
            JsonNode response = signUp("Harsh_99", "Harsh@Example.com", "password123");

            assertThat(response.get("token").asText()).isNotBlank();
            assertThat(response.at("/user/username").asText()).isEqualTo("harsh_99");
            assertThat(response.at("/user/email").asText()).isEqualTo("harsh@example.com");
            assertThat(response.at("/user/id").asText()).isNotBlank();
            assertThat(response.has("passwordHash")).isFalse();
            assertThat(response.get("user").has("passwordHash")).isFalse();
        }

        @Test
        void storesBcryptHashNotPlainPassword() throws Exception {
            signUp("harsh", "harsh@example.com", "password123");

            User stored = users.values().iterator().next();
            assertThat(stored.getPasswordHash()).isNotEqualTo("password123").startsWith("$2");
        }

        @Test
        void rejectsDuplicateUsernameCaseInsensitively() throws Exception {
            signUp("harsh", "one@example.com", "password123");

            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "HARSH", "email", "two@example.com", "password", "password123"))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("Username is already taken"));
        }

        @Test
        void rejectsDuplicateEmail() throws Exception {
            signUp("harsh", "same@example.com", "password123");

            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "other", "email", "SAME@example.com", "password", "password123"))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("Email is already registered"));
        }

        @Test
        void returnsConflictWhenDatabaseUniqueIndexRejectsARacingSignUp() throws Exception {
            when(userRepository.save(any(User.class))).thenThrow(new DuplicateKeyException("E11000"));

            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "racer", "email", "racer@example.com", "password", "password123"))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value("Username or email is already taken"));
        }

        @Test
        void validatesUsername() throws Exception {
            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "a b", "email", "x@example.com", "password", "password123"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message")
                            .value("Username must be 3-32 characters: letters, numbers, '_' or '-'"));
        }

        @Test
        void validatesEmail() throws Exception {
            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "harsh", "email", "not-an-email", "password", "password123"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Email address is invalid"));
        }

        @Test
        void validatesPasswordLength() throws Exception {
            mvc.perform(post("/api/auth/sign-up").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of(
                                    "username", "harsh", "email", "x@example.com", "password", "short"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Password must be 8-72 characters"));
        }
    }

    @Nested
    class SignIn {

        @BeforeEach
        void existingUser() throws Exception {
            signUp("harsh", "harsh@example.com", "password123");
        }

        @Test
        void withUsername() throws Exception {
            mvc.perform(post("/api/auth/sign-in").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("identifier", "Harsh", "password", "password123"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.user.username").value("harsh"));
        }

        @Test
        void withEmail() throws Exception {
            mvc.perform(post("/api/auth/sign-in").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("identifier", " HARSH@example.com ", "password", "password123"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user.email").value("harsh@example.com"));
        }

        @Test
        void wrongPassword() throws Exception {
            mvc.perform(post("/api/auth/sign-in").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("identifier", "harsh", "password", "wrong-password"))))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid username/email or password"));
        }

        @Test
        void unknownUserGetsSameMessageAsWrongPassword() throws Exception {
            mvc.perform(post("/api/auth/sign-in").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("identifier", "nobody", "password", "password123"))))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid username/email or password"));
        }

        @Test
        void missingFields() throws Exception {
            mvc.perform(post("/api/auth/sign-in").contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("identifier", "", "password", "x"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Username or email is required"));
        }
    }

    @Nested
    class Session {

        @Test
        void meReturnsCurrentUserForValidToken() throws Exception {
            JsonNode account = signUp("harsh", "harsh@example.com", "password123");

            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + account.get("token").asText()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(account.at("/user/id").asText()))
                    .andExpect(jsonPath("$.username").value("harsh"));
        }

        @Test
        void meWithoutTokenIsUnauthorizedJson() throws Exception {
            mvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("User is not authenticated"));
        }

        @Test
        void tamperedTokenIsRejected() throws Exception {
            JsonNode account = signUp("harsh", "harsh@example.com", "password123");

            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + account.get("token").asText() + "x"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void tokenForDeletedUserIsRejected() throws Exception {
            JsonNode account = signUp("harsh", "harsh@example.com", "password123");
            users.clear();

            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + account.get("token").asText()))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class StreamToken {

        @Test
        void requiresAuthentication() throws Exception {
            mvc.perform(get("/api/stream/token"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void issuesStreamTokenForTheSignedInUser() throws Exception {
            JsonNode account = signUp("harsh", "harsh@example.com", "password123");
            String userId = account.at("/user/id").asText();

            String body = mvc.perform(get("/api/stream/token")
                            .header("Authorization", "Bearer " + account.get("token").asText()))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();

            Claims claims = Jwts.parser()
                    .verifyWith(new SecretKeySpec(STREAM_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                    .build()
                    .parseSignedClaims(json.readTree(body).get("token").asText())
                    .getPayload();

            assertThat(claims.get("user_id", String.class)).isEqualTo(userId);
            assertThat(claims.getExpiration()).isInTheFuture();
        }
    }

    @Nested
    class Cors {

        @Test
        void allowsFrontendOrigin() throws Exception {
            mvc.perform(options("/api/auth/sign-in")
                            .header("Origin", "http://localhost:3000")
                            .header("Access-Control-Request-Method", "POST")
                            .header("Access-Control-Request-Headers", "content-type"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        }

        @Test
        void rejectsOtherOrigins() throws Exception {
            mvc.perform(options("/api/auth/sign-in")
                            .header("Origin", "http://evil.example.com")
                            .header("Access-Control-Request-Method", "POST"))
                    .andExpect(status().isForbidden());
        }
    }
}
