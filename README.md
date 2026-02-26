# DGII Consulta de Vehículos API

Esta es una API Serverless creada específicamente para la página oficial de la DGII de República Dominicana para la consulta de placa de vehículos. El proyecto está diseñado como un backend puramente funcional ideal para desplegarse fácilmente en **Vercel** usando Node.js.

El proyecto cuenta con:
- Una **API Route Serverless** orientada a exportar un handler en `api/vehiculo.ts`. Recibe `cedula` y `placa` y responde con la información del vehículo en formato JSON.

## Cómo probar localmente

1. Clonar el repositorio y entrar a la carpeta.
2. Instalar dependencias con `npm install`.
3. Ejecutar el servidor de desarrollo usando Vercel CLI:
   ```bash
   npx vercel dev
   ```
4. Puedes probar el API directamente en: 
   `http://localhost:3000/api/vehiculo?cedula=22400288332&placa=G645134`

## Cómo Desplegar en Vercel

Este proyecto está construido nativamente para el ecosistema "Serverless Functions" de Vercel.

1. Sube este código a un repositorio en **GitHub**, **GitLab** o **Bitbucket**.
2. Entra a [Vercel](https://vercel.com/) y dale a **Add New > Project**.
3. Importa tu repositorio.
4. El "Framework Preset" sugerido será **Other** o **Node.js**. Déjalo así.
5. Dale a **Deploy**.

Vercel detectará automáticamente la carpeta `/api` y compilará al vuelo los archivos TypeScript al momento del despliegue.

### Uso del API ya desplegado
Una vez tengas tu dominio de Vercel (ej: `https://mi-dgii-api.vercel.app`), puedes utilizar el servicio desde cualquier frontend, llamando a:
```bash
curl -X GET "https://mi-dgii-api.vercel.app/api/vehiculo?cedula=TU_CEDULA&placa=TU_PLACA"
```
