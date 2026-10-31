package com.yoom.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignUpRequest(
            @NotBlank(message = "Username is required")
            @Pattern(regexp = "^[a-zA-Z0-9_-]{3,32}$",
                    message = "Username must be 3-32 characters: letters, numbers, '_' or '-'")
            String username,

            @NotBlank(message = "Email is required")
            @Email(message = "Email address is invalid")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
            String password) {
    }

    public record SignInRequest(
            @NotBlank(message = "Username or email is required") String identifier,
            @NotBlank(message = "Password is required") String password) {
    }

    public record UserResponse(String id, String username, String email, String imageUrl) {

        static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getImageUrl());
        }
    }

    public record AuthResponse(String token, UserResponse user) {
    }
}
