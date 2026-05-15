package com.smartaccounting.repository;

import com.smartaccounting.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    Optional<AttendanceRecord> findByTenantIdAndEmployeeIdAndAttendanceDate(
        UUID tenantId, UUID employeeId, LocalDate attendanceDate);
    List<AttendanceRecord> findByTenantIdAndAttendanceDate(UUID tenantId, LocalDate attendanceDate);
    long countByTenantIdAndAttendanceDate(UUID tenantId, LocalDate attendanceDate);

    @Query("""
        select count(a) from AttendanceRecord a
        where a.employeeId = :employeeId and a.status = :status
          and a.attendanceDate >= :fromDate and a.attendanceDate <= :toDate
        """)
    int countByEmployeeIdAndMonthAndStatus(
        @Param("employeeId") UUID employeeId,
        @Param("status") String status,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate);

    default int countByEmployeeIdAndMonthAndStatus(UUID employeeId, YearMonth ym, String status) {
        return countByEmployeeIdAndMonthAndStatus(
            employeeId, status, ym.atDay(1), ym.atEndOfMonth());
    }

    @Query("""
        select count(distinct a.employeeId) from AttendanceRecord a
        where a.tenantId = :tenantId and a.status = :status
          and a.attendanceDate >= :fromDate and a.attendanceDate <= :toDate
        """)
    long countDistinctEmployeesByTenantIdAndStatusAndDateBetween(
        @Param("tenantId") UUID tenantId,
        @Param("status") String status,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate);
}
