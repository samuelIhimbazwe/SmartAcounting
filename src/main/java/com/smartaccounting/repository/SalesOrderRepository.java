package com.smartaccounting.repository;
import com.smartaccounting.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SalesOrderRepository extends JpaRepository<SalesOrder, UUID> {}
