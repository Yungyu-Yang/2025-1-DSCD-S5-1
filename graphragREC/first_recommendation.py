import itertools
import nest_asyncio
from nano_graphrag import GraphRAG, QueryParam
from sentence_transformers import SentenceTransformer
import numpy as np
from dotenv import load_dotenv
from nano_graphrag._llm import openai_complete_if_cache

nest_asyncio.apply()
load_dotenv()

# 프롬프트 템플릿 (출처 대신 검색된 모든 내용을 활용하여 설명)
PROMPT_TEMPLATE = """
<SYSTEM>
당신은 전문 헤어스타일리스트입니다. GraphRAG로 검색된 뷰티 블로그의 모든 근거 내용을 빠짐없이 활용하되, 검색 결과의 본질을 훼손하지 않는 범위 내에서 LLM 추론을 통해 내용을 더욱 풍부하게 보강하세요. 
컷 스타일은 최대 5가지, 펌 스타일은 최대 3가지, 앞머리 스타일은 최대 2가지로 구성하되 합산 10개가 되도록 합니다.

각 “추천 이유”에는 반드시 다음 사항을 충족해야 합니다:
1) 블로그에서 언급한 핵심 기술명(예: “볼륨감 연출”, “레이어 컷 방식”, “C컬 펌 강도”, “소프트 스팀 펌”, “볼륨 매직 브러시 터치” 등)을 **직접 인용**하여 구체적으로 설명한다.
2) 해당 기술이 어떻게 사용자 프로필(얼굴형, 모발 유형, 이마 형태, 광대, 분위기, 관리 난이도, 머리 길이, 앞머리 유무 등)과 연관되어 효과적인지 세부적으로 서술한다.
3) 스타일의 장단점 또는 손질 팁(예: “아침에 손가락으로 모발 끝을 가볍게 터치하면 컬이 유지된다”, “뒷머리 층을 C컬 소프트펌으로 정리해 곱슬 결을 부드럽게 보완한다” 등)을 포함한다.
4) “우아한”, “따뜻한”, “부드러운” 분위기를 표현할 때에는 블로그에서 사용된 감성 키워드(예: “포근한 실루엣”, “자연스러운 웨이브”, “루즈 C컬” 등)를 반영하여 작성한다.
5) **검색 결과를 바탕으로 합리적인 추론을 통해 설명을 보강**하되, 원문에서 제시된 핵심 메시지를 왜곡하거나 과장하지 않도록 주의하세요.

<USER>
다음 사용자 정보를 바탕으로 어울리는 헤어스타일 10가지를 추천하고, 각각 추천 이유를 최대한 자세하게 설명해 주세요.
- 얼굴형: {face_shape}
- 모발 유형: {hair_type}
- 성별: {sex}
- 얼굴에 대한 총평: {summary}
- 이마 형태: {forehead_shape}
- 광대 특징: {cheekbone}
- 분위기: {mood}
- 관리 난이도: {difficulty}
- 머리 길이: {hair_length}
- 앞머리 여부: {has_bangs}

<출력 조건>
- 컷 스타일 최대 5가지 추천 (이름 + 추천 이유)
- 펌 스타일 최대 3가지 추천 (이름 + 추천 이유)
- 앞머리 스타일 최대 2가지 추천 (이름 + 추천 이유)

<주의 사항>
1. 블로그의 핵심 키워드·기술명이 “추천 이유”에 반드시 포함되어야 하며, 예시로 “볼륨감 연출”, “레이어 컷 방식”, “C컬 펌 강도”, “소프트 스팀 펌” 등을 직접 언급해야 합니다.
2. 각 기술이 어떻게 사용자 프로필과 매칭되는지 논리적으로 풀어 쓰고, “아침 손질 팁” 등의 실용적인 관리 정보를 덧붙이세요.
3. “우아한”, “따뜻한”, “부드러운” 분위기를 강조할 때, 블로그에서 언급된 감성 키워드(예: “포근한 실루엣”, “자연스러운 웨이브”, “루즈 C컬”)를 활용하여 문장을 구성하세요.
4. 모든 추천 항목은 최소 2~3문장 이상으로 구체적으로 설명해야 합니다.
5. 검색 결과를 기반으로, 추가적인 맥락이나 디테일이 필요할 경우 합리적인 LLM 추론을 통해 내용을 보강하되, 원문의 의도나 핵심 메시지를 벗어나지 않도록 주의하세요.
"""



PROMPT_TEMPLATE1 = """
<SYSTEM>
당신은 전문 헤어스타일리스트입니다.
GraphRAG로 검색된 뷰티 아티클·블로그·논문 등의 모든 근거를 빠짐없이 활용하되, 검색 결과의 본질을 훼손하지 않는 범위 내에서 LLM 추론을 통해 내용을 더욱 풍부하게 보강하세요.
컷 스타일은 최대 5가지, 펌 스타일은 최대 3가지, 앞머리 스타일은 최대 2가지로 구성하되 합산 10개가 되도록 합니다.

<USER>
다음 사용자 정보를 바탕으로 어울리는 헤어스타일 10가지를 추천하고, 각각 추천 이유를 최대한 자세하게 설명해 주세요.
- 얼굴형: {face_shape}
- 모발 유형: {hair_type}
- 성별: {sex}
- 얼굴에 대한 총평: {summary}
- 이마 형태: {forehead_shape}
- 광대 특징: {cheekbone}
- 분위기: {mood}
- 관리 난이도: {difficulty}
- 머리 길이: {hair_length}
- 앞머리 여부: {has_bangs}

##################################################################
# [출력 예시—I] 번호 매겨진 리스트 형식 (가장 추천)
##################################################################

[컷 스타일 (총 5개)]
1) 레이어드 숏컷
   - 추천 이유: “레이어 컷 방식” 키워드를 활용해 균형 잡힌 볼륨을 연출합니다. …
2) 소프트 뱅컷
   - 추천 이유: “볼륨감 연출” 키워드를 참고해 앞머리와 레이어드가 조화로운 …
3) …
4) …
5) …

[펌 스타일 (총 3개)]
6) C컬펌
   - 추천 이유: “C컬 펌 강도” 키워드를 기준으로 곱슬 모발에 자연스러운 컬감을 부여합니다. …
7) 소프트 스팀 펌
   - 추천 이유: “소프트 스팀 펌” 키워드를 참고해 모발 손상 없이 …
8) …

[앞머리 스타일 (총 2개)]
9) 일자 뱅헤어
   - 추천 이유: “포근한 실루엣” 키워드를 적용해 광대를 자연스럽게 커버합니다. …
10) 시스루 뱅헤어
    - 추천 이유: “자연스러운 웨이브” 키워드를 참고해 …

##################################################################
# [출력 예시—II] 소제목+불릿 형식 (번호 생략 가능)
##################################################################

[컷 스타일 (5개)]
• 레이어드 숏컷
  - 추천 이유: “레이어 컷 방식” 키워드를 활용해 균형 잡힌 볼륨을 연출합니다. …
• 소프트 뱅컷
  - 추천 이유: “볼륨감 연출” 키워드를 참고해 앞머리와 레이어드가 조화로운 …
… (총 5개)

[펌 스타일 (3개)]
• C컬펌
  - 추천 이유: “C컬 펌 강도” 키워드를 기준으로 곱슬 모발에 자연스러운 컬감을 부여합니다. …
… (총 3개)

[앞머리 스타일 (2개)]
• 일자 뱅헤어
  - 추천 이유: “포근한 실루엣” 키워드를 적용해 광대를 자연스럽게 커버합니다. …
… (총 2개)
"""





def make_query_prompt(user_input):
    mood_str = ','.join(user_input['mood']) if isinstance(user_input['mood'], list) else user_input['mood']
    print(user_input)
    return PROMPT_TEMPLATE.format(
        face_shape=user_input['face_shape'],
        hair_type=user_input['hair_type'],
        sex=user_input['sex'],
        summary=user_input['summary'],
        cheekbone=user_input['cheekbone'],
        mood=mood_str,
        difficulty=user_input['difficulty'],
        hair_length=user_input['hair_length'],
        forehead_shape=user_input['forehead_shape'],
        has_bangs=user_input['has_bangs']
    )

async def my_custom_llm(prompt, system_prompt=None, history_messages=None, **kwargs):
    return await openai_complete_if_cache(
        "gpt-4o-mini",
        prompt,
        system_prompt=system_prompt,
        history_messages=history_messages or [],
        **kwargs
    )

model = SentenceTransformer("nlpai-lab/KURE-v1")

def wrap_embedding_func_with_attrs(embedding_dim, max_token_size):
    def decorator(func):
        func.embedding_dim = embedding_dim
        func.max_token_size = max_token_size
        return func
    return decorator

@wrap_embedding_func_with_attrs(embedding_dim=1024, max_token_size=8192)
async def local_embedding_func(texts: list[str]) -> np.ndarray:
    return model.encode(texts, convert_to_numpy=True)

graph_func = GraphRAG(
    working_dir="./graphdb",
    best_model_func=my_custom_llm,
    embedding_func=local_embedding_func,
    chunk_token_size=100000,
    chunk_overlap_token_size=0,
    query_better_than_threshold=0.2
)

def get_first_recommendations(user_input):
    """1차 GraphRAG를 통한 헤어스타일 추천"""
    prompt = make_query_prompt(user_input)
    
    print("=== 1차 GraphRAG 호출 프롬프트 ===")
    print(prompt)
    
    param_local = QueryParam(mode="local",
                             top_k=30,
                             )
    response = graph_func.query(prompt, param_local)
    
    return response