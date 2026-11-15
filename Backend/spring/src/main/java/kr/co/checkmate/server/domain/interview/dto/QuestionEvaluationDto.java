package kr.co.checkmate.server.domain.interview.dto;

import jakarta.validation.constraints.NotBlank;
import kr.co.checkmate.server.domain.interview.entity.InterviewQuestionEvaluation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionEvaluationDto {

    private UUID id;

    @NotBlank(message = "질문 내용은 필수입니다.")
    private String questionText;

    private String category;
    private Boolean checked;
    private Integer score;
    private String interviewerNote;

    public static QuestionEvaluationDto from(InterviewQuestionEvaluation entity) {
        return QuestionEvaluationDto.builder()
                .id(entity.getId())
                .questionText(entity.getQuestionText())
                .category(entity.getCategory())
                .checked(entity.isChecked())
                .score(entity.getScore())
                .interviewerNote(entity.getInterviewerNote())
                .build();
    }

    public InterviewQuestionEvaluation toEntity() {
        return InterviewQuestionEvaluation.builder()
                .questionText(this.questionText)
                .category(this.category)
                .checked(this.checked)
                .score(this.score)
                .interviewerNote(this.interviewerNote)
                .build();
    }
}
