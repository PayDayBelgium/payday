import { useState, useCallback } from 'react';

/**
 * Custom hook for managing form data state with type safety
 * @param initialData - The initial form data
 * @returns Form data, update function, and reset function
 */
export function useFormData<T extends Record<string, any>>(initialData: T) {
  const [formData, setFormData] = useState<T>(initialData);

  /**
   * Update a single field in the form data
   */
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback((updates: Partial<T>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Reset form data to initial values
   */
  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  /**
   * Set entire form data (useful for loading existing data)
   */
  const setForm = useCallback((data: T) => {
    setFormData(data);
  }, []);

  return {
    formData,
    updateField,
    updateFields,
    resetForm,
    setForm,
  };
}
