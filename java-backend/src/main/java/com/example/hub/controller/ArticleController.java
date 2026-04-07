package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.Article;
import com.example.hub.mapper.ArticleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class ArticleController {

    @Autowired
    private ArticleMapper articleMapper;

    @GetMapping
    public List<Article> getAllArticles() {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getTenantId, TenantContext.getCurrentTenant())
                .orderByDesc(Article::getIsPinned)
                .orderByDesc(Article::getPublishDate);
        return articleMapper.selectList(queryWrapper);
    }

    @GetMapping("/{id}")
    public Article getArticleById(@PathVariable Long id) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        return Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
    }

    @PostMapping
    public Article createArticle(@RequestBody Article article) {
        article.setTenantId(TenantContext.getCurrentTenant());
        articleMapper.insert(article);
        return article;
    }

    @PutMapping("/{id}")
    public Article updateArticle(@PathVariable Long id, @RequestBody Article articleDetails) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        Article article = Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
        
        article.setTitle(articleDetails.getTitle());
        article.setSubtitle(articleDetails.getSubtitle());
        article.setCategoryId(articleDetails.getCategoryId());
        article.setSummary(articleDetails.getSummary());
        article.setContent(articleDetails.getContent());
        article.setThumbnailUrl(articleDetails.getThumbnailUrl());
        article.setStatus(articleDetails.getStatus());
        article.setPublishDate(articleDetails.getPublishDate());
        article.setReadingTime(articleDetails.getReadingTime());
        article.setAllowAnonymous(articleDetails.getAllowAnonymous());
        article.setAllowAllRegistered(articleDetails.getAllowAllRegistered());
        article.setAllowedRoles(articleDetails.getAllowedRoles());
        article.setAllowedUsers(articleDetails.getAllowedUsers());
        article.setIsPinned(articleDetails.getIsPinned());
        
        articleMapper.updateById(article);
        return article;
    }

    @PatchMapping("/{id}")
    public Article patchArticle(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        Article article = Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
        
        updates.forEach((key, value) -> {
            switch (key) {
                case "title": article.setTitle((String) value); break;
                case "subtitle": article.setSubtitle((String) value); break;
                case "category_id": article.setCategoryId(((Number) value).longValue()); break;
                case "summary": article.setSummary((String) value); break;
                case "content": article.setContent((String) value); break;
                case "thumbnail_url": article.setThumbnailUrl((String) value); break;
                case "status": article.setStatus((String) value); break;
                case "publish_date": article.setPublishDate((String) value); break;
                case "reading_time": article.setReadingTime(((Number) value).intValue()); break;
                case "allow_anonymous": article.setAllowAnonymous((Boolean) value ? 1 : 0); break;
                case "allow_all_registered": article.setAllowAllRegistered((Boolean) value ? 1 : 0); break;
                case "allowed_roles": article.setAllowedRoles((String) value); break;
                case "allowed_users": article.setAllowedUsers((String) value); break;
                case "is_pinned": article.setIsPinned(((Number) value).intValue()); break;
            }
        });
        
        articleMapper.updateById(article);
        return article;
    }

    @DeleteMapping("/{id}")
    public void deleteArticle(@PathVariable Long id) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        Article article = Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
        articleMapper.deleteById(article.getId());
    }

    @PostMapping("/{id}/view")
    public void incrementViewCount(@PathVariable Long id) {
        LambdaQueryWrapper<Article> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Article::getId, id)
                .eq(Article::getTenantId, TenantContext.getCurrentTenant());
        Article article = Optional.ofNullable(articleMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Article not found with id: " + id));
        article.setViewCount(article.getViewCount() + 1);
        articleMapper.updateById(article);
    }
}
