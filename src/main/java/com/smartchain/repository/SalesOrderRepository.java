package com.smartchain.repository;
import com.smartchain.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SalesOrderRepository extends JpaRepository<SalesOrder, UUID> {}
