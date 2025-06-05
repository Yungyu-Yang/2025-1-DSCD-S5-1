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
2차 추천 시 반드시 제공된 스타일 사전에 있는 항목만 사용해야 하며, 그 외 항목은 생성하거나 언급해서는 안 됩니다.

- 출력은 반드시 **아래 형식의 JSON**으로만 작성하세요. 자연어 문장, 주석, 번호 매김 없이 **정확히 JSON 구조**를 따라야 합니다.

각 추천은 아래 네 가지를 모두 충족하며, 최소 3~4문장 이상이어야 합니다:
1) 사용자 프로필(얼굴형, 이마, 모발 유형, 분위기 등)에 기반한 이유 설명
2) 블로그에서 검색된 기술 키워드 직접 인용
3) 실사용자가 따라할 수 있는 구체적인 관리 팁
"""


USER_PROMPT_TEMPLATE = """
1) 1차 생성 결과입니다:
{first_response}

2) 사용할 수 있는 스타일 사전입니다 (단일/조합형 포함):
{style_dict}

3) 스타일 사전 내 스타일 중 **최대 4개**만 추천해 주세요.  
   - 절대로 스타일 사전 외 항목은 사용하지 마세요.  
   - 스타일 사전 내의 항목을 **대소문자, 언더바, 공백, 특수문자까지 하나도 틀리지 말고** 그대로 사용해야 합니다.  
   - 아래 JSON 예시 형식을 **정확히 그대로** 따르세요.

```json
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
    print(user_prompt)
    
    print("=== 2차 최종 추천 호출 ===")
    response_text = call_gpt4o(SYSTEM_PROMPT, user_prompt)
    print("Raw Response:", response_text)
    
    # JSON 추출 및 파싱
    final_recommendations = extract_json_from_response(response_text)
    
    return final_recommendations