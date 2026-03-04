# API Chequeo Preventivo

Endpoint backend para recomendaciones preventivas basadas en el seed USPSTF A/B filtrado a exámenes diagnósticos de adolescentes y adultos.

## Endpoint

`POST /api/checkup/recommend`

## Ejemplo mínimo

```bash
curl -X POST http://localhost:3000/api/checkup/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "age": 30,
    "sex": "Female",
    "sexuallyActive": true
  }'
```

## Ejemplo con embarazo

```bash
curl -X POST http://localhost:3000/api/checkup/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "age": 28,
    "sex": "Female",
    "pregnant": true,
    "gestationWeeks": 28,
    "sexuallyActive": true
  }'
```

## Ejemplo con tabaquismo y riesgo metabólico

```bash
curl -X POST http://localhost:3000/api/checkup/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "age": 67,
    "sex": "Male",
    "everSmoked": true,
    "currentSmoker": true,
    "smokingPackYears": 30,
    "bmi": 29.5
  }'
```

## Smoke tests

```bash
npm run test:checkup-recommend
```
