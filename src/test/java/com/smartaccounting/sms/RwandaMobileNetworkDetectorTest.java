package com.smartaccounting.sms;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RwandaMobileNetworkDetectorTest {

    @Test
    void detectsMtnNumbers() {
        assertThat(RwandaMobileNetworkDetector.detect("+250788123456")).isEqualTo(RwandaMobileNetwork.MTN);
        assertThat(RwandaMobileNetworkDetector.detect("+250791234567")).isEqualTo(RwandaMobileNetwork.MTN);
        assertThat(RwandaMobileNetworkDetector.detect("0788123456")).isEqualTo(RwandaMobileNetwork.MTN);
    }

    @Test
    void detectsAirtelNumbers() {
        assertThat(RwandaMobileNetworkDetector.detect("+250733998877")).isEqualTo(RwandaMobileNetwork.AIRTEL);
        assertThat(RwandaMobileNetworkDetector.detect("+250721112233")).isEqualTo(RwandaMobileNetwork.AIRTEL);
    }

    @Test
    void unknownForOtherPrefixes() {
        assertThat(RwandaMobileNetworkDetector.detect("+250701234567")).isEqualTo(RwandaMobileNetwork.UNKNOWN);
        assertThat(RwandaMobileNetworkDetector.detect("+14155552671")).isEqualTo(RwandaMobileNetwork.UNKNOWN);
    }
}
