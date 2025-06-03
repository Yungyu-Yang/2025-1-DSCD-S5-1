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
당신은 전문 헤어스타일리스트입니다. GraphRAG로 검색된 뷰티 블로그의 근거를 바탕으로, 아래 규칙에 따라 추천을 생성하세요:

[출력 구성]
- **무조건** 10개: 컷 스타일 **정확히 5개**, 펌 스타일 **정확히 3개**, 앞머리 스타일 **정확히 2개**를 반환하세요.
- 각 스타일은 이름 + 추천 이유로 구성해야 합니다.

[추천 이유 구성 조건]
1. **핵심 기술명 인용**: 블로그에서 언급된 기술명을 직접 인용 
2. **프로필 연관 설명**: 얼굴형, 모발 유형, 이마/광대 형태 등과의 연관성 서술
3. **실용 관리 팁**: 구체적인 스타일링 팁 제공 
4. **왜곡 없이 보강**: 원문 메시지를 과장 없이 풍부하게 보완
5. **길이**: 추천 이유는 반드시 2~3문장 이상

<USER>
- 얼굴형: {face_shape}
- 모발 유형: {hair_type}
- 성별: {sex}
- 얼굴 총평: {summary}
- 이마 형태: {forehead_shape}
- 광대 특징: {cheekbone}
- 분위기: {mood}
- 관리 난이도: {difficulty}
- 머리 길이: {hair_length}
- 앞머리 여부: {has_bangs}
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
                             top_k=50,
                             )
    response = graph_func.query(prompt, param_local)
    
    return response