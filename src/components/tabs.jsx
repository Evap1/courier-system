export const Tabs = ({ tabs, current, onChange }) => (
    <div style={{ marginBottom: "20px" }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: "10px 16px",
            marginRight: "10px",
            background: tab === current ? "#007bff" : "#f1f1f1",
            color: tab === current ? "#fff" : "#000",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );