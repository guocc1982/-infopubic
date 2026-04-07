package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.Comment;
import com.example.hub.mapper.CommentMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/articles/{articleId}/comments")
@CrossOrigin(origins = "*")
public class CommentController {

    @Autowired
    private CommentMapper commentMapper;

    @GetMapping
    public List<Comment> getCommentsByArticleId(@PathVariable Long articleId) {
        LambdaQueryWrapper<Comment> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Comment::getArticleId, articleId)
                .eq(Comment::getTenantId, TenantContext.getCurrentTenant())
                .orderByDesc(Comment::getCreatedAt);
        return commentMapper.selectList(queryWrapper);
    }

    @PostMapping
    public Comment createComment(@PathVariable Long articleId, @RequestBody Comment comment) {
        comment.setArticleId(articleId);
        comment.setTenantId(TenantContext.getCurrentTenant());
        commentMapper.insert(comment);
        return comment;
    }
}
