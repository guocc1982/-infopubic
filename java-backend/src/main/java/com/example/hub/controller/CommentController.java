package com.example.hub.controller;

import com.example.hub.config.TenantContext;
import com.example.hub.entity.Comment;
import com.example.hub.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/articles/{articleId}/comments")
@CrossOrigin(origins = "*")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    @GetMapping
    public List<Comment> getCommentsByArticleId(@PathVariable Long articleId) {
        return commentRepository.findAllByArticleIdAndTenantIdOrderByCreatedAtDesc(articleId, TenantContext.getCurrentTenant());
    }

    @PostMapping
    public Comment createComment(@PathVariable Long articleId, @RequestBody Comment comment) {
        comment.setArticleId(articleId);
        comment.setTenantId(TenantContext.getCurrentTenant());
        return commentRepository.save(comment);
    }
}
