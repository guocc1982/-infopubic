package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.User;
import com.example.hub.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserMapper userMapper;

    @GetMapping
    public List<User> getAllUsers() {
        LambdaQueryWrapper<User> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(User::getTenantId, TenantContext.getCurrentTenant());
        return userMapper.selectList(queryWrapper);
    }
}
