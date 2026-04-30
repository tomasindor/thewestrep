"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";

import { fetchDepartamentosAction } from "@/app/(public)/checkout/actions";
import type { CheckoutCustomerV2 } from "@/lib/orders/checkout.shared";
import { checkoutOrderCustomerV2Schema } from "@/lib/orders/checkout.shared";
import type { Provincia } from "@/lib/address/georef";
import { inputClassName } from "@/lib/ui";

interface AddressFormProps {
  provinces: Provincia[];
  onSubmit: (data: CheckoutCustomerV2) => void;
}

export interface AddressFormHandle {
  triggerSubmit: () => void;
}

export const AddressForm = forwardRef<AddressFormHandle, AddressFormProps>(function AddressForm(
  { provinces, onSubmit },
  ref,
) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    provinceId: "",
    provinceName: "",
    cityId: "",
    cityName: "",
    address: "",
    recipient: "",
    notes: "",
  });

  const [cities, setCities] = useState<{ id: string; nombre: string }[]>([]);
  const [cityError, setCityError] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const result = checkoutOrderCustomerV2Schema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return null;
    }
    setFieldErrors({});
    return result.data;
  }, [formData]);

  useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      const validated = validate();
      if (validated) {
        onSubmit(validated);
      }
    },
  }), [validate, onSubmit]);

  useEffect(() => {
    if (!formData.provinceId) {
      setCities([]);
      setFormData((prev) => ({ ...prev, cityId: "", cityName: "" }));
      return;
    }

    const selectedProvince = provinces.find((p) => p.id === formData.provinceId);
    setFormData((prev) => ({ ...prev, provinceName: selectedProvince?.nombre ?? "" }));

    setIsLoadingCities(true);
    setCityError(null);

    fetchDepartamentosAction(formData.provinceId)
      .then((result) => {
        if (result.error) {
          setCityError(result.error);
          setCities([]);
        } else {
          setCities(result.departamentos);
        }
      })
      .catch(() => {
        setCityError("No pudimos cargar las ciudades ahora.");
        setCities([]);
      })
      .finally(() => {
        setIsLoadingCities(false);
      });
  }, [formData.provinceId, provinces]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validate();
    if (validated) {
      onSubmit(validated);
    }
  };

  const inputBase = inputClassName;
  const errorBase = "border-red-300/30 bg-red-500/10 text-red-100";

  const getInputClass = (field: keyof typeof formData) => {
    const hasError = fieldErrors[field];
    return [inputBase, hasError ? errorBase : ""].filter(Boolean).join(" ");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-white/80">
          Nombre y apellido
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          className={getInputClass("name")}
          placeholder="Tu nombre completo"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-300">{fieldErrors.name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-white/80">
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className={getInputClass("phone")}
            placeholder="+54 9 11 5555 5555"
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-xs text-red-300">{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-white/80">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={getInputClass("email")}
            placeholder="tu@email.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-300">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="provinceId" className="mb-1 block text-sm text-white/80">
            Provincia
          </label>
          <select
            id="provinceId"
            value={formData.provinceId}
            onChange={(e) => updateField("provinceId", e.target.value)}
            className={[inputBase, "appearance-none", getInputClass("provinceId") !== inputBase ? errorBase : ""].filter(Boolean).join(" ")}
          >
            <option value="">Seleccioná provincia</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.nombre}
              </option>
            ))}
          </select>
          {fieldErrors.provinceId && (
            <p className="mt-1 text-xs text-red-300">{fieldErrors.provinceId}</p>
          )}
        </div>

        <div>
          <label htmlFor="cityId" className="mb-1 block text-sm text-white/80">
            Ciudad
          </label>
          <select
            id="cityId"
            value={formData.cityId}
            onChange={(e) => {
              const cityId = e.target.value;
              const city = cities.find((c) => c.id === cityId);
              setFormData((prev) => ({ ...prev, cityId, cityName: city?.nombre ?? "" }));
              if (fieldErrors.cityId) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.cityId;
                  return next;
                });
              }
            }}
            disabled={!formData.provinceId || isLoadingCities}
            className={[inputBase, "appearance-none", getInputClass("cityId") !== inputBase ? errorBase : ""].filter(Boolean).join(" ")}
          >
            <option value="">{isLoadingCities ? "Cargando..." : "Seleccioná ciudad"}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.nombre}
              </option>
            ))}
          </select>
          {fieldErrors.cityId && (
            <p className="mt-1 text-xs text-red-300">{fieldErrors.cityId}</p>
          )}
          {cityError && (
            <p className="mt-1 text-xs text-red-300">{cityError}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm text-white/80">
          Dirección de entrega
        </label>
        <input
          id="address"
          type="text"
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          className={getInputClass("address")}
          placeholder="Calle y número"
        />
        {fieldErrors.address && (
          <p className="mt-1 text-xs text-red-300">{fieldErrors.address}</p>
        )}
      </div>

      <div>
        <label htmlFor="recipient" className="mb-1 block text-sm text-white/80">
          Quién recibe
        </label>
        <input
          id="recipient"
          type="text"
          value={formData.recipient}
          onChange={(e) => updateField("recipient", e.target.value)}
          className={getInputClass("recipient")}
          placeholder="Nombre de quien recibe el pedido"
        />
        {fieldErrors.recipient && (
          <p className="mt-1 text-xs text-red-300">{fieldErrors.recipient}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-white/80">
          Notas <span className="text-white/40">(opcional)</span>
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          className={inputBase}
          rows={3}
          placeholder="Indicaciones adicionales para la entrega"
        />
      </div>

    </form>
  );
});
