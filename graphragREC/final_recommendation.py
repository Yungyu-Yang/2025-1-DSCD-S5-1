import openai
import os
import json
import re

# OpenAI 클라이언트 초기화
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 헤어스타일 사전
HAIR_STYLE_DICT = {
    "남성": {
        "단일_스타일": [
            "포마드컷", "리젠트컷", "리젠트펌", "아이비리그컷", "스왓컷", "크롭컷", "바버컷", "모히칸컷",
            "시스루댄디컷", "슬릭댄디컷", "슬릭백언더컷", "가일컷", "슬릭가일컷", "투블럭컷", "댄디펌", 
            "애즈펌", "슬릭애즈펌", "가일펌", "쉐도우펌", "스핀스왈로펌", "프링펌", "아이롱펌", "샤기컷", 
            "장발", "리프컷", "울프컷", "히피펌", "빈티지펌"
        ]
    },
    "여성": {
        "단일_스타일": [
            "글래펌", "샤밍컷", "베베컷", "빈티지펌", "웨이브펌", "테슬펌", "엘리자베스펌", "그레이스펌", 
            "구름펌", "테슬컷", "슬릭컷", "페이지컷", "샌드펌", "허쉬펌", "레이어드펌", "슬릭펌", "빌드펌", 
            "허그펌", "블럭컷", "바디펌", "S컬펌", "히메컷", "뱅헤어", "물결펌", "플라워펌", "리프컷", 
            "샤기컷", "숏컷", "히피펌", "젤리펌", "C컬펌", "허쉬컷", "레이어드컷", "발레아쥬"
        ],
        "조합_스타일": [
            "태슬펌_태슬컷", "C컬펌_레이어드컷", "허그펌_레이어드컷", "웨이브펌_레이어드컷", 
            "빈티지펌_레이어드컷", "S컬펌_레이어드컷", "그레이스펌_레이어드컷", "엘리자벳펌_레이어드컷", 
            "빌드펌_레이어드컷", "샌드펌_레이어드컷", "블럭컷", "C컬펌_허쉬컷", "웨이브펌_일자컷", 
            "글램펌_레이어드컷", "히피펌_샤기컷", "히피펌_레이어드컷", "구름펌_레이어드컷", 
            "슬릭펌_슬릭컷", "C컬펌_일자컷", "허쉬펌_허쉬컷"
        ]
    }
}

SYSTEM_PROMPT = """
당신은 전문 헤어스타일리스트입니다.
다음 1차 추천 결과와 스타일 사전을 바탕으로, 2차 추천을 진행합니다. 
모든 추천 항목은 **3~4문장 이상**으로 설명하며, 
‘왜 이 스타일이 어울리는지(얼굴형·모발 유형·이마 형태·광대·분위기·관리 난이도·머리 길이·앞머리 유무 등)’와 
‘검색된 블로그의 핵심 기술·키워드(예: 볼륨감 연출, 레이어 컷 방식, C컬 펌 강도, 소프트 스팀 펌, 볼륨 매직 브러시 터치 등)’를 **직접 인용**하여 구체적으로 서술해야 합니다.
또한, 실사용 관점의 **구체적인 관리 팁**(예: “아침에 손가락으로 모발 끝을 가볍게 터치하면 컬이 유지된다”, “뒷머리 층을 C컬 소프트펌으로 정리해 곱슬 결을 부드럽게 보완한다” 등)을 포함하세요.
마지막으로, “우아한·따뜻한·부드러운” 분위기를 표현할 때는 블로그에서 언급된 감성 키워드(예: 포근한 실루엣, 자연스러운 웨이브, 루즈 C컬 등)를 **반드시 한 문장 이상** 활용해야 합니다.
"""

USER_PROMPT_TEMPLATE = """
1) 아래는 1차 생성 결과(첫 번째 단계 추천)입니다.
{first_response}

2) 아래는 2차 추천에 사용할 헤어스타일 사전입니다. (결합형 스타일도 포함)
{style_dict}

3) 위 사전 내에서만 **단일 스타일 1~2개 + 조합 스타일 1~2개**를 선택하여 **최대 4개** (더 적어도 무관, 단 충분히 설명 가능한 것만) 추천해 주세요.
   - 1차 생성 결과에서 제시된 ‘사용자 프로필 정보’(얼굴형·모발 유형·이마 형태·광대·분위기·관리 난이도·머리 길이·앞머리 유무 등)와 
     1차 추천 항목에서 사용된 **핵심 기술·키워드**(예: “볼륨감 연출”, “레이어 컷 방식”, “C컬 펌 강도” 등)를 
     **한 번 이상 직접 인용**하고, 
     해당 기술이 왜 이 사용자에게 적합한지 **논리적으로 풀어서** 기술해야 합니다.
   - 각 추천 뒤에는 반드시 **3~4문장 이상**의 “구체적인 설명”을 작성하세요.
     1) “왜 이 스타일이 어울리는지” – 1차 결과와 사용자 프로필을 바탕으로
     2) “검색된 블로그 키워드 또는 기술명” 인용 (예시: 볼륨감 연출, 레이어 컷 방식, C컬 소프트펌 등)
     3) “실제 사용자가 따라 할 수 있는 관리 팁” 구체적으로 기술
     4) “우아한·따뜻한·부드러운” 분위기를 표현할 때는 블로그 감성 키워드(포근한 실루엣, 자연스러운 웨이브, 루즈 C컬 등)를 최소 **한 문장 이상** 포함

4) 절대 사전 외 스타일을 생성하거나, 1차 추천 결과를 임의로 변경·추가하지 마세요.

출력 예시:
{{
  "recommendations": [
    {{
      "style": "스타일명",
      "description": "이 스타일이 어울리는 이유"
    }},
    {{
      "style": "다른 스타일명",
      "description": "이 스타일이 어울리는 이유"
    }}
    // 최대 4개 항목
  ]
}}
"""


def format_style_dict(sex):
    """성별에 따른 스타일 사전을 문자열로 포맷"""
    if sex == "남성":
        return f"- 남성 단일 스타일: {', '.join(HAIR_STYLE_DICT['남성']['단일_스타일'])}"
    else:
        single_styles = ', '.join(HAIR_STYLE_DICT['여성']['단일_스타일'])
        combo_styles = ', '.join(HAIR_STYLE_DICT['여성']['조합_스타일'])
        return f"- 여성 단일 스타일: {single_styles}\n- 조합 스타일: {combo_styles}"

def call_gpt4o(system_prompt, user_prompt):
    """GPT-4o 호출"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7
    )
    return response.choices[0].message.content

def extract_json_from_response(response_text):
    """응답에서 JSON 추출"""
    try:
        # JSON 블록 찾기
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # 중괄호로 둘러싸인 JSON 찾기
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response_text
        
        return json.loads(json_str)
    except json.JSONDecodeError:
        # JSON 파싱 실패 시 기본 구조로 변환 시도
        return {"recommendations": [{"style": "파싱 실패", "description": response_text}]}

def get_final_recommendations(first_response, user_sex):
    """2차 최종 헤어스타일 추천"""
    style_dict_str = format_style_dict(user_sex)
    
    user_prompt = USER_PROMPT_TEMPLATE.format(
        first_response=first_response,
        style_dict=style_dict_str
    )
    
    print("=== 2차 최종 추천 호출 ===")
    response_text = call_gpt4o(SYSTEM_PROMPT, user_prompt)
    print("Raw Response:", response_text)
    
    # JSON 추출 및 파싱
    final_recommendations = extract_json_from_response(response_text)
    
    return final_recommendations