-- 0033: 시세분석에 '입력값 지문(input_hash)' 추가.
-- 차량 입력값(+정비이력)이 직전 분석과 같으면 AI 재호출 없이 직전 결과를 그대로 재사용하기 위함.
-- 입력이 바뀌면 hash가 달라져 새로 분석한다.

alter table public.price_analyses
  add column if not exists input_hash text;

comment on column public.price_analyses.input_hash is '분석 당시 차량 입력값+정비이력의 SHA-256 지문. 동일하면 결과 재사용.';
