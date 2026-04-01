package com.example.hub.repository;

import com.example.hub.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByTenantIdOrderByDisplayOrderAsc(String tenantId);
    Optional<Category> findByIdAndTenantId(Long id, String tenantId);
}
