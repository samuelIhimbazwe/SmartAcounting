package com.smartaccounting.compliance;

import com.smartaccounting.dto.TinValidateRequest;
import com.smartaccounting.dto.TinValidationResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TinValidationControllerTest {
    @Mock
    private TinValidationService tinValidationService;

    @InjectMocks
    private TinValidationController controller;

    @Test
    void validateDelegatesToService() {
        when(tinValidationService.validate("123456789"))
            .thenReturn(TinValidationResponse.ok("ACME Rwanda"));

        TinValidationResponse out = controller.validate(new TinValidateRequest("123456789"));

        assertThat(out.valid()).isTrue();
        assertThat(out.registered()).isTrue();
        assertThat(out.name()).isEqualTo("ACME Rwanda");
        verify(tinValidationService).validate("123456789");
    }
}
