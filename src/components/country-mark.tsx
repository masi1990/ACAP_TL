/** Country name with its flag. The name stays visible if the flag image cannot load. */
export function CountryMark({ iso2, name }: { iso2: string; name: string }) {
  const code = iso2.trim().toLowerCase();
  if (!name && !code) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {/^[a-z]{2}$/.test(code) ? (
        <img
          src={`https://flagcdn.com/24x18/${code}.png`}
          srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
          width={24}
          height={18}
          alt=""
          className="h-[18px] w-6 rounded-sm border border-black/10 object-cover"
        />
      ) : null}
      <span>{name}</span>
    </span>
  );
}
