# Fix: Registration - Send role in signUp metadata

## Problem:
Błąd podczas rejestracji: Trigger `handle_new_user` oczekuje pola `role` w `raw_user_meta_data`, ale aplikacja go nie wysyłała.

## Przyczyna:
Trigger w bazie danych:
```sql
INSERT INTO public.profiles (..., role)
VALUES (..., (new.raw_user_meta_data->>'role')::user_role_enum);
```

Wymaga, aby `role` było wysłane podczas `signUp`, ale kod wysyłał tylko `email` i `password`.

## Rozwiązanie:

### Przed (❌ Błędne):
```typescript
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
});
// ❌ BŁĄD: Nie wysyła roli -> Trigger dostaje NULL -> Błąd bazy danych
```

### Po (✅ Poprawne):
```typescript
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      // ✅ TO JEST KLUCZOWE: Trigger oczekuje roli w raw_user_meta_data
      role: formData.role, // 'worker' lub 'company'
    },
  },
});
```

## Co zostało zmienione:

1. **Dodano `options.data.role`** w `signUp` - trigger otrzyma rolę w `raw_user_meta_data`
2. **Usunięto ręczne tworzenie profilu** - trigger `handle_new_user` zrobi to automatycznie
3. **Zachowano redirect** do odpowiedniego onboarding

## Jak to działa:

1. Użytkownik wypełnia formularz z rolą (`worker` lub `company`)
2. `signUp` wysyła rolę w `options.data.role`
3. Supabase zapisuje to w `raw_user_meta_data`
4. Trigger `handle_new_user` automatycznie:
   - Tworzy profil w tabeli `profiles`
   - Ustawia rolę z `raw_user_meta_data->>'role'`
   - Ustawia `is_verified: false`
5. Aplikacja przekierowuje do odpowiedniego onboarding

## Testowanie:

1. Przejdź do `/register` lub `/register/worker` lub `/register/company`
2. Wypełnij formularz rejestracji
3. Wybierz rolę (Worker lub Company)
4. Kliknij "Opret konto"
5. ✅ Powinno działać bez błędów
6. ✅ Profil powinien być automatycznie utworzony przez trigger

## Sprawdzenie w Supabase:

1. **Supabase Dashboard** → **Table Editor** → **profiles**
2. Sprawdź czy nowy profil został utworzony z poprawną rolą
3. Sprawdź czy `is_verified` jest `false`

## Jeśli nadal masz błędy:

1. **Sprawdź czy trigger istnieje:**
   - Supabase Dashboard → Database → Functions
   - Szukaj `handle_new_user`

2. **Sprawdź czy tabela `profiles` istnieje:**
   - Supabase Dashboard → Table Editor
   - Powinna być widoczna tabela `profiles`

3. **Sprawdź logi:**
   - Supabase Dashboard → Logs → Postgres Logs
   - Szukaj błędów związanych z triggerem

