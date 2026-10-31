package com.yoom.auth;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.yoom.auth.AuthDtos.AuthResponse;
import com.yoom.auth.AuthDtos.SignInRequest;
import com.yoom.auth.AuthDtos.SignUpRequest;
import com.yoom.auth.AuthDtos.UserResponse;
import com.yoom.common.ApiException;
import com.yoom.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse signUp(SignUpRequest request) {
        // usernames and emails are stored lowercase so lookups are case-insensitive
        String username = request.username().toLowerCase(Locale.ROOT);
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username is already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }

        User user = userRepository.save(new User(username, email, passwordEncoder.encode(request.password())));

        return toAuthResponse(user);
    }

    public AuthResponse signIn(SignInRequest request) {
        String identifier = request.identifier().trim().toLowerCase(Locale.ROOT);

        User user = (identifier.contains("@")
                ? userRepository.findByEmail(identifier)
                : userRepository.findByUsername(identifier))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username/email or password"));

        return toAuthResponse(user);
    }

    public UserResponse getUser(String userId) {
        return userRepository.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User is not authenticated"));
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(jwtService.createToken(user.getId()), UserResponse.from(user));
    }
}
