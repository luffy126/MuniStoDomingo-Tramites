# 🎨 Sistema de Diseño: MuniStoDomingo

Esta guía contiene los valores exactos que debes configurar en tu archivo de Figma antes de empezar a dibujar las pantallas.

## 1. Estructura recomendada del archivo Figma
Crea las siguientes páginas (Pages) en el panel izquierdo de Figma:
1. **🌈 Foundations:** (Aquí pondrás los colores y tipografías)
2. **🧩 Components:** (Botones, inputs, modales base)
3. **📱 App Vecino (Mobile):** (Pantallas del ciudadano)
4. **💻 Portal Funcionario (Web):** (Pantallas del funcionario)

---

## 2. Paleta de Colores (Identidad Municipal)
Configura estos colores en los **Local Styles** de Figma para que puedas reutilizarlos con un clic.

**Brand Colors (Colores Principales)**
*   **Primary (Azul Cívico):** `#004B87` *(Transmite oficialidad, confianza y seriedad)*
*   **Primary Tint:** `#3376A9` *(Para hover en botones)*
*   **Secondary (Verde Esperanza):** `#228C22` *(Para acciones positivas o identidad ecológica de la comuna)*
*   **Tertiary (Dorado/Amarillo):** `#F2A900` *(Acentos y notificaciones destacadas)*

**Backgrounds & Surfaces (Fondos)**
*   **Background App:** `#F4F5F8` *(Fondo general de la app, gris muy claro)*
*   **Surface:** `#FFFFFF` *(Fondo de tarjetas, modales y menúes)*
*   **Lines/Borders:** `#E2E8F0` *(Para divisores y bordes de inputs)*

**Text Colors (Textos)**
*   **Text Main:** `#1F2937` *(Casi negro, para títulos y texto principal)*
*   **Text Muted:** `#6B7280` *(Gris para subtítulos y placeholders)*

**Status Colors (Feedback)**
*   **Success:** `#2DD36F`
*   **Warning:** `#FFC409`
*   **Danger (Error):** `#EB445A`

---

## 3. Tipografía
Usa tipografías sans-serif limpias, legibles en pantallas pequeñas y nativas.
*   **Fuente recomendada:** `Inter` o `Roboto` (Ambas gratuitas en Google Fonts/Figma).
*   **Estilos a guardar en Figma (Text Styles):**
    *   `H1 - Page Title`: Bold, 28px
    *   `H2 - Section Title`: SemiBold, 22px
    *   `H3 - Card Title`: Medium, 18px
    *   `Body - Regular`: Regular, 16px (Texto normal)
    *   `Body - Small`: Regular, 14px (Textos de apoyo)
    *   `Button`: SemiBold, 16px, ALL CAPS o Title Case.

---

## 4. Grilla y Espaciado (Layout Grid)
Configura estos *Layout Grids* en tus *Frames* (lienzos) en Figma.

### 📱 Para Mobile (Vecino)
*   **Frame recomendado:** iPhone 14/15 Pro (393 x 852)
*   **Grid:** Columns
*   **Count:** 4
*   **Margin:** 16px *(Espacio entre el borde de la pantalla y el contenido)*
*   **Gutter:** 16px *(Espacio entre columnas)*

### 💻 Para Web (Funcionario)
*   **Frame recomendado:** Desktop (1440 x 1024)
*   **Grid:** Columns
*   **Count:** 12
*   **Margin:** 64px o Auto (centrado con max-width)
*   **Gutter:** 24px

---

## 5. Mapeo de Componentes a Ionic
No dibujes rectángulos desde cero. Usa componentes que existan en Ionic para que el paso a código sea 1:1.

| Elemento Figma | Componente Ionic equivalente a codificar |
| :--- | :--- |
| Barra superior con título | `<IonHeader>` + `<IonToolbar>` + `<IonTitle>` |
| Menú inferior (App) | `<IonTabs>` + `<IonTabBar>` |
| Menú lateral (Web) | `<IonMenu>` |
| Tarjeta de trámite | `<IonCard>` + `<IonCardHeader>` + `<IonCardContent>` |
| Campo de texto | `<IonInput label="Nombre" labelPlacement="stacked">` |
| Botón principal | `<IonButton expand="block" color="primary">` |
| Loader/Spinner | `<IonSpinner name="crescent">` o `<IonSkeletonText>` |
