package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.SystemSettings;
import com.example.hub.mapper.SystemSettingsMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SystemSettingsController {

    @Autowired
    private SystemSettingsMapper settingsMapper;

    @GetMapping
    public SystemSettings getSettings() {
        LambdaQueryWrapper<SystemSettings> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SystemSettings::getTenantId, TenantContext.getCurrentTenant());
        SystemSettings settings = settingsMapper.selectOne(queryWrapper);
        if (settings == null) {
            // Return default settings if none exist
            settings = new SystemSettings();
            settings.setSiteName("Hub CMS");
            settings.setSiteDescription("A modern content management system");
            settings.setAllowRegistration(true);
            settings.setDefaultRole("user");
            settings.setEnableComments(true);
            settings.setRequireCommentApproval(false);
            settings.setEmailNotifications(true);
            settings.setPushNotifications(false);
            settings.setTheme("light");
            settings.setPrimaryColor("#4f46e5");
            settings.setLanguage("zh-CN");
            settings.setTimezone("UTC+8");
            settings.setTenantId(TenantContext.getCurrentTenant());
        }
        return settings;
    }

    @PostMapping
    public SystemSettings saveSettings(@RequestBody SystemSettings settings) {
        settings.setTenantId(TenantContext.getCurrentTenant());
        LambdaQueryWrapper<SystemSettings> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SystemSettings::getTenantId, TenantContext.getCurrentTenant());
        SystemSettings existing = settingsMapper.selectOne(queryWrapper);

        if (existing != null) {
            settings.setId(existing.getId());
            settingsMapper.updateById(settings);
        } else {
            settingsMapper.insert(settings);
        }
        return settings;
    }
}
