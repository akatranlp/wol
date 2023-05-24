import { useCallback, useEffect, useState } from "react";

export const useLocalStorage = <TObj>(key: string, defaultValue?: TObj) => {
  return useStorage(key, window.localStorage, defaultValue);
};
export const useSessionStorage = <TObj>(key: string, defaultValue?: TObj) => {
  return useStorage(key, window.sessionStorage, defaultValue);
};

const useStorage = <TObj>(key: string, storageObject: Storage, defaultValue?: TObj) => {
  const [value, setValue] = useState<TObj | undefined>(() => {
    const jsonValue = storageObject.getItem(key);

    if (jsonValue != null) {
      try {
        return JSON.parse(jsonValue);
      } catch (e) {}
    }
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    if (value === undefined) return storageObject.removeItem(key);
    storageObject.setItem(key, JSON.stringify(value));
  }, [key, value, storageObject]);

  const remove = useCallback(() => {
    setValue(undefined);
  }, []);

  return [value, setValue, remove] as const;
};
