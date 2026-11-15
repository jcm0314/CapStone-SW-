package kr.co.checkmate.server.domain.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import kr.co.checkmate.server.domain.evaluation.entity.EvidenceSentence;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceSentenceDto {

    private UUID id;

    @NotBlank(message = "역량 카테고리는 필수입니다.")
    private String category;

    @NotBlank(message = "근거 문장은 필수입니다.")
    private String sentence;

    private Integer quoteOffsetStart;
    private Integer quoteOffsetEnd;
    private Double confidenceScore;
    private String rationale;
    private String interviewQuestion;

    public static EvidenceSentenceDto from(EvidenceSentence entity) {
        return EvidenceSentenceDto.builder()
                .id(entity.getId())
                .category(entity.getCategory())
                .sentence(entity.getSentence())
                .quoteOffsetStart(entity.getQuoteOffsetStart())
                .quoteOffsetEnd(entity.getQuoteOffsetEnd())
                .confidenceScore(entity.getConfidenceScore())
                .rationale(entity.getRationale())
                .interviewQuestion(entity.getInterviewQuestion())
                .build();
    }

    public EvidenceSentence toEntity() {
        return EvidenceSentence.builder()
                .category(this.category)
                .sentence(this.sentence)
                .quoteOffsetStart(this.quoteOffsetStart)
                .quoteOffsetEnd(this.quoteOffsetEnd)
                .confidenceScore(this.confidenceScore)
                .rationale(this.rationale)
                .interviewQuestion(this.interviewQuestion)
                .build();
    }
}

