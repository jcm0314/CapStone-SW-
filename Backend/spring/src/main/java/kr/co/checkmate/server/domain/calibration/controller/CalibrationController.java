package kr.co.checkmate.server.domain.calibration.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationRecordRequest;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileUpsertRequest;
import kr.co.checkmate.server.domain.calibration.service.CalibrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}")
@RequiredArgsConstructor
public class CalibrationController {

    private final CalibrationService calibrationService;

    @PutMapping("/weights")
    public ResponseEntity<ApiResponse<WeightProfileResponse>> saveOrUpdateWeights(
            @PathVariable UUID tenantId,
            @Valid @RequestBody WeightProfileUpsertRequest request
    ) {
        WeightProfileResponse response = calibrationService.saveOrUpdateWeightProfile(tenantId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/weights")
    public ResponseEntity<ApiResponse<List<WeightProfileResponse>>> getWeights(
            @PathVariable UUID tenantId,
            @RequestParam(required = false) String jobRole
    ) {
        List<WeightProfileResponse> responses = calibrationService.getWeightProfiles(tenantId, jobRole);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/calibrations")
    public ResponseEntity<ApiResponse<CalibrationResponse>> recordCalibration(
            @PathVariable UUID tenantId,
            @Valid @RequestBody CalibrationRecordRequest request
    ) {
        CalibrationResponse response = calibrationService.recordCorrection(tenantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/calibrations")
    public ResponseEntity<ApiResponse<List<CalibrationResponse>>> getCalibrations(
            @PathVariable UUID tenantId,
            @RequestParam(required = false) UUID applicantId
    ) {
        List<CalibrationResponse> responses = calibrationService.getCalibrations(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }
}
