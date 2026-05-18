package com.smartaccounting.oauth2;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Map;

public class SmartChainOAuth2User implements OAuth2User {
    private final OAuth2User delegate;
    private final OAuth2AuthenticatedUser user;
    private final SocialIdentityRecord identity;

    public SmartChainOAuth2User(OAuth2User delegate, OAuth2AuthenticatedUser user, SocialIdentityRecord identity) {
        this.delegate = delegate;
        this.user = user;
        this.identity = identity;
    }

    public OAuth2AuthenticatedUser getUser() {
        return user;
    }

    public SocialIdentityRecord getIdentity() {
        return identity;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        return delegate.getName();
    }
}
