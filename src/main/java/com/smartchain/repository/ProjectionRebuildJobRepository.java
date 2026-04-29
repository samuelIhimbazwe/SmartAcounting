package com.smartchain.repository;

import com.smartchain.entity.ProjectionRebuildJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectionRebuildJobRepository extends JpaRepository<ProjectionRebuildJob, UUID> {
}
