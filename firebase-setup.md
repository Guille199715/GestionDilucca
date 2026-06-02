# Configurar Firebase

1. Entra a https://console.firebase.google.com/ y crea un proyecto.
2. Agrega una app web dentro del proyecto.
3. Copia el objeto `firebaseConfig` que te muestra Firebase.
4. Pegalo en `firebase-config.js`, reemplazando los valores vacios.
5. En Firebase, crea una base de datos Cloud Firestore.
6. Activa Authentication > Sign-in method > Email/password.
7. Crea los usuarios desde Authentication > Users.
8. Copia el UID del usuario creado.
9. En Firestore, crea una coleccion `authorizedUsers`.
10. Dentro de `authorizedUsers`, crea un documento con ID igual al UID del usuario.
11. Usa estas reglas en Firestore:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthorized() {
      return request.auth != null
        && exists(/databases/$(database)/documents/authorizedUsers/$(request.auth.uid));
    }

    match /businesses/dilucca/{document=**} {
      allow read, write: if isAuthorized();
    }

    match /authorizedUsers/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

Estas reglas permiten leer y escribir solo a usuarios que iniciaron sesion y cuyo UID esta cargado en `authorizedUsers`.
No actives registro publico en la pagina: crea usuarios manualmente desde Firebase para controlar quien entra.

Si ya tenes datos cargados en la PC y Firebase esta vacio, la app los sube automaticamente la primera vez que abre con Firebase configurado.
