import prisma from "@/app/lib/prisma";

export default async function fooldal() {
  const users = await prisma.user.findMany(); // Adatok lekérése az adatbázisból

  return (
    <main>
      <h1>Felhasználók</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.username} - {user.role}</li>
        ))}
      </ul>
    </main>
  );
}