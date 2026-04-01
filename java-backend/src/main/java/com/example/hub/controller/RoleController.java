package com.example.hub.controller;

import com.example.hub.config.TenantContext;
import com.example.hub.entity.Role;
import com.example.hub.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleRepository roleRepository;

    @GetMapping
    public List<Role> getAllRoles() {
        return roleRepository.findAllByTenantId(TenantContext.getCurrentTenant());
    }
}
