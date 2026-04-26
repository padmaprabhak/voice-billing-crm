package com.billingcrm.security;

import com.billingcrm.model.User;
import com.billingcrm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Always normalise to lowercase — consistent with AuthServiceImpl
        String normalised = email.trim().toLowerCase();

        User user = userRepository.findByEmail(normalised)
                .orElseThrow(() -> {
                    log.warn("[UserDetailsService] Not found: {}", normalised);
                    return new UsernameNotFoundException("User not found: " + normalised);
                });

        log.debug("[UserDetailsService] Loaded: {} role={}", normalised, user.getRole());

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())   // MUST match JWT subject
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .disabled(!user.isEnabled())
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .build();
    }
}