import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        panel: "#141414",
        panel2: "#1C1C1C",
        line: "#2C2C2C",
        ink: "#FAFAFA",
        mute: "#8C8C8C",
        // CMYK da logo Érius — cada cor com um papel fixo
        ciano: "#00AEEF",   // positivo / receita
        magenta: "#EC008C", // alerta / crítico
        amarelo: "#FFF200", // atenção / pendência
        preto: "#1A1A1A",
        // aliases usados nos gráficos e KPIs (mapeados pro CMYK)
        verde: "#00AEEF",
        azul: "#00AEEF",
        roxo: "#EC008C",
        vermelho: "#EC008C",
      },
      fontFamily: {
        display: ["Saira", "system-ui", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
