package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.Article;
import com.example.hub.entity.User;
import com.example.hub.mapper.ArticleMapper;
import com.example.hub.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/external/articles")
@Tag(name = "External Article API", description = "Endpoints for external systems to access article data")
@CrossOrigin(origins = "*")
public class ExternalArticleController {

    @GetMapping("/test")
    @Operation(summary = "Test endpoint", description = "Simple endpoint to verify the external API is reachable")
    public String test() {
        return "External API is reachable";
    }

    @Autowired
    private ArticleMapper articleMapper;

    @Autowired
    private UserMapper userMapper;

    @GetMapping
    @Operation(summary = "Get viewable articles for a user", description = "Returns a list of articles that the specified user has permission to view")
    public List<Article> getViewableArticles(
            @Parameter(description = "Username of the user requesting the list") @RequestParam String username) {
        
        // 1. Fetch user to get their role
        LambdaQueryWrapper<User> userQuery = new LambdaQueryWrapper<>();
        userQuery.eq(User::getUsername, username)
                .eq(User::getTenantId, TenantContext.getCurrentTenant());
        User user = userMapper.selectOne(userQuery);

        // 2. Fetch all articles for the tenant
        LambdaQueryWrapper<Article> articleQuery = new LambdaQueryWrapper<>();
        articleQuery.eq(Article::getTenantId, TenantContext.getCurrentTenant())
                .eq(Article::getStatus, "published"); // Only published articles
        List<Article> allArticles = articleMapper.selectList(articleQuery);

        // 3. Filter based on permissions
        return allArticles.stream().filter(article -> {
            // Anonymous allowed
            if (Boolean.TRUE.equals(article.getAllowAnonymous())) return true;
            
            // If user not found, only anonymous articles are visible
            if (user == null) return false;

            // All registered users allowed
            if (Boolean.TRUE.equals(article.getAllowAllRegistered())) return true;

            // Check roles
            if (article.getAllowedRoles() != null && !article.getAllowedRoles().isEmpty()) {
                String[] roles = article.getAllowedRoles().split(",");
                for (String role : roles) {
                    if (role.trim().equals(user.getRole())) return true;
                }
            }

            // Check specific users
            if (article.getAllowedUsers() != null && !article.getAllowedUsers().isEmpty()) {
                String[] users = article.getAllowedUsers().split(",");
                for (String u : users) {
                    if (u.trim().equals(user.getUsername())) return true;
                }
            }

            return false;
        }).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get article details", description = "Returns the full details of a specific article by its ID")
    public Article getArticleById(@Parameter(description = "ID of the article") @PathVariable Long id) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        return Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
    }
}
