# Configurar Firebase

1. Entrá a https://console.firebase.google.com/ y creá un proyecto.
2. Agregá una app web dentro del proyecto.
3. Copiá el objeto `firebaseConfig` que te muestra Firebase.
4. Pegalo en `firebase-config.js`, reemplazando los valores vacíos.
5. En Firebase, creá una base de datos Cloud Firestore.
6. Activá Authentication > Sign-in method > Email/password.
7. Creá los usuarios desde Authentication > Users.
8. Copiá el UID del usuario creado.
9. En Firestore, creá una colección `authorizedUsers`.
10. Dentro de `authorizedUsers`, creá un documento con ID igual al UID del usuario.
11. Usá estas reglas en Firestore:

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

Estas reglas permiten leer y escribir solo a usuarios que iniciaron sesión y cuyo UID está cargado en `authorizedUsers`.
No actives registro público en la página: creá usuarios manualmente desde Firebase para controlar quién entra.

Si ya tenés datos cargados en la PC y Firebase está vacío, la app los sube automáticamente la primera vez que abre con Firebase configurado.
