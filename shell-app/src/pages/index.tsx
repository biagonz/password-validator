import dynamic from "next/dynamic";

const PasswordValidator = dynamic(
  () => import("mfePassword/PasswordValidator"),
  {
    ssr: false,
    // Exibido enquanto o componente remoto está sendo baixado
    loading: () => (
      <div style={{ padding: "2rem", color: "#6b7280" }}>
        Loading password validator...
      </div>
    ),
  },
);

export default function Home() {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "700",
            marginBottom: "1.5rem",
            color: "#111827",
          }}
        >
          Password Validation App
        </h1>

        <PasswordValidator />
      </div>
    </main>
  );
}
