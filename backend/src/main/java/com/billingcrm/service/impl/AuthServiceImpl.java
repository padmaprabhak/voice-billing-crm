package com.billingcrm.service.impl;

import com.billingcrm.dto.request.AuthRequest;
import com.billingcrm.dto.response.AuthResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.exception.UnauthorizedException;
import com.billingcrm.model.User;
import com.billingcrm.repository.UserRepository;
import com.billingcrm.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtService            jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    // ── Login ─────────────────────────────────────────────────────────
    public AuthResponse.TokenResponse login(AuthRequest.Login request) {
        log.info("[AuthService] Login attempt for: {}", request.getEmail());

        // Authenticate via Spring Security
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail().trim().toLowerCase(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException ex) {
            log.warn("[AuthService] Bad credentials for: {}", request.getEmail());
            throw new UnauthorizedException("Invalid email or password");
        } catch (DisabledException ex) {
            log.warn("[AuthService] Account disabled: {}", request.getEmail());
            throw new UnauthorizedException("Account is disabled");
        }

        // Load the User entity for the response body
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("User not found after authentication"));

        // Build UserDetails from the entity — consistent subject for JWT
        UserDetails userDetails = buildUserDetails(user);
        String token = jwtService.generateToken(userDetails);

        log.info("[AuthService] Login successful: {} role={}", user.getEmail(), user.getRole());
        return buildResponse(token, user);
    }

    // ── Register ──────────────────────────────────────────────────────
    public AuthResponse.TokenResponse register(AuthRequest.Register request) {
        String email = request.getEmail().trim().toLowerCase();
        log.info("[AuthService] Register attempt for: {}", email);

        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("User", "email", email);
        }

        User.Role role = User.Role.USER;
        if (request.getRole() != null && !request.getRole().isBlank()) {
            try { role = User.Role.valueOf(request.getRole().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .enabled(true)
                .build();

        userRepository.save(user);
        log.info("[AuthService] Registered: {} id={}", user.getEmail(), user.getId());

        UserDetails userDetails = buildUserDetails(user);
        String token = jwtService.generateToken(userDetails);
        return buildResponse(token, user);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Build a Spring Security UserDetails from our User entity.
     * The username MUST match exactly what the JwtAuthenticationFilter
     * will look up via UserDetailsService.loadUserByUsername().
     * We use email (lowercased) as the subject.
     */
    private UserDetails buildUserDetails(User user) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())   // email is the JWT subject
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .disabled(!user.isEnabled())
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .build();
    }

    private AuthResponse.TokenResponse buildResponse(String token, User user) {
        return AuthResponse.TokenResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }
}