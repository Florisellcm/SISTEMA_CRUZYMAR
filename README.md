# 🥛 CRUZYMAR — Sistema de Gestión Lácteos
### Prototipo · Dashboard

---

## Estructura del Proyecto

```
cruzymar-proto/
├── backend/
│   ├── data/
│   │   └── db.js           ← Base de datos en memoria (datos de prueba)
│   ├── middleware/
│   │   └── auth.js         ← Verificación de token JWT
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login
│   │   └── dashboard.js    ← GET  /api/dashboard
│   ├── server.js           ← Servidor Express principal
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── css/
    │   └── styles.css      ← Estilos con colores corporativos CRUZYMAR
    ├── js/
    │   └── app.js          ← Lógica del dashboard
    └── index.html          ← Página principal (login + dashboard)
```

---

## Instalación y Ejecución

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Iniciar el servidor
```bash
npm start
# o para desarrollo con auto-reload:
npm run dev
```

### 3. Abrir en el navegador
```
http://localhost:3000
```

---

## Credenciales de Acceso

| Campo    | Valor                   |
|----------|-------------------------|
| Email    | admin@cruzymar.com      |
| Password | admin123                |

---

## API Endpoints

| Método | Ruta               | Descripción              | Auth |
|--------|--------------------|--------------------------|------|
| POST   | /api/auth/login    | Login, retorna JWT token | No   |
| GET    | /api/dashboard     | KPIs y datos del panel   | Sí   |

---

## Colorimetría Corporativa

| Color           | HEX       | Uso                              |
|-----------------|-----------|----------------------------------|
| Azul Corporativo| #003C78   | Color principal, sidebar, títulos|
| Verde Campo     | #468C28   | Acento, indicadores positivos    |
| Blanco Pureza   | #FFFFFF   | Fondos, contraste                |

---

## Tecnologías

- **Backend:** Node.js · Express · JWT · bcryptjs
- **Frontend:** HTML5 · CSS3 · Vanilla JS
- **Fuente:** Outfit (Google Fonts)
- **Datos:** En memoria (sin base de datos para el prototipo)

---

> Prototipo funcional listo para expandir con módulos de
> Producción, Ventas, Clientes, Inventario y Reportes.
