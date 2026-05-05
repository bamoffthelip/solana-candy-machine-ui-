import { FC, useCallback, useState, type ChangeEvent } from "react";
import { parseSolanaAddresses } from "../../../../lib/parse-addresses";

type AirdropRecipientInputProps = {
  value: string;
  onChange: (text: string, addresses: string[]) => void;
  disabled?: boolean;
};

export const AirdropRecipientInput: FC<AirdropRecipientInputProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const [fileName, setFileName] = useState<string>("");

  const handleText = useCallback(
    (text: string) => {
      const addresses = parseSolanaAddresses(text);
      onChange(text, addresses);
    },
    [onChange]
  );

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const text = await file.text();
      handleText(text);
    },
    [handleText]
  );

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Recipients</p>
        <label className="btn btn-xs border border-white/20 bg-black/40">
          <input
            type="file"
            accept=".csv,.txt,text/plain"
            className="hidden"
            disabled={disabled}
            onChange={onFile}
          />
          Upload CSV / TXT
        </label>
      </div>
      <p className="text-xs opacity-70">
        One address per line, or comma-separated. Invalid entries are skipped. {fileName ? `Loaded: ${fileName}` : ""}
      </p>
      <textarea
        className="textarea-bordered textarea h-40 w-full border-white/20 bg-black/40 font-mono text-xs"
        placeholder="DYw8jCTfwHNRJhhmFcbQv8KFiSLyC9T7YD1f92Sx6Y..."
        value={value}
        disabled={disabled}
        onChange={(e) => handleText(e.target.value)}
      />
    </div>
  );
};
