package com.smartaccounting.compliance;

import org.junit.platform.suite.api.SelectClasses;
import org.junit.platform.suite.api.Suite;

/**
 * Compliance module unit tests (TIN validation, EBM helpers).
 */
@Suite
@SelectClasses({
    TinValidationServiceTest.class,
    TinValidationControllerTest.class,
})
public class ComplianceTestSuite {}
