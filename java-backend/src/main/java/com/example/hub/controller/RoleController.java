package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.Role;
import com.example.hub.mapper.RoleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleMapper roleMapper;

    @GetMapping
    public List<Role> getAllRoles() {
        LambdaQueryWrapper<Role> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Role::getTenantId, TenantContext.getCurrentTenant());
        return roleMapper.selectList(queryWrapper);
    }
}
