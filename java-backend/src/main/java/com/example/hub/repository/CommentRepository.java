package com.example.hub.repository;

import com.example.hub.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findAllByArticleIdOrderByCreatedAtDesc(Long articleId);
}
