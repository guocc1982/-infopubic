package com.example.hub.repository;

import com.example.hub.entity.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findAllByOrderByIsPinnedDescPublishDateDesc();
}
