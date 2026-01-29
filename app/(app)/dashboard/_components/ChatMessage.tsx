export default function ChatMessage({
  role,
  content,
  theme = "light",
}: {
  role: "user" | "assistant";
  content: string;
  theme?: "light" | "dark";
}) {
  const isUser = role === "user";
  const isDark = theme === "dark";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? isDark
              ? "bg-[#e8eaed] text-[#202124]"
              : "bg-black text-white"
            : isDark
              ? "border border-[#5f6368] bg-[#303134] text-[#e8eaed]"
              : "border border-gray-200 bg-gray-100 text-black"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
