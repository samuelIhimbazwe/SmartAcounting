package com.smartchain.repository;
import com.smartchain.entity.CloseTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface CloseTaskRepository extends JpaRepository<CloseTask, UUID> {
    List<CloseTask> findByPeriodOrderByCreatedAtAsc(String period);
    Optional<CloseTask> findByPeriodAndTaskKey(String period, String taskKey);
}
