package com.example.hub.controller;

import com.example.hub.config.TenantContext;
import com.example.hub.entity.User;
import com.example.hub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAllByTenantId(TenantContext.getCurrentTenant());
    }
}
