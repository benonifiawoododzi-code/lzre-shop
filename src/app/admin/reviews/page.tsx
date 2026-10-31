import { answerQuestionAction, moderateReviewAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const [reviews, questions] = await Promise.all([
    prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { product: true } }),
    prisma.productQuestion.findMany({ where: { status: "PENDING" }, take: 30 }),
  ]);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Reviews and questions</h1>
      {reviews.map((review) => (
        <form action={moderateReviewAction} className="mt-4 border-b border-line pb-3" key={review.id}>
          <p>{review.product.name}: {review.title} · {review.status}</p>
          <input name="id" type="hidden" value={review.id} />
          <input name="status" type="hidden" value={review.status === "HIDDEN" ? "PUBLISHED" : "HIDDEN"} />
          <button type="submit">{review.status === "HIDDEN" ? "Publish" : "Hide"}</button>
        </form>
      ))}
      {questions.map((question) => (
        <form action={answerQuestionAction} className="mt-4 grid gap-2" key={question.id}>
          <p>{question.body}</p>
          <input name="id" type="hidden" value={question.id} />
          <textarea className="border border-line p-2" name="answer" required />
          <button type="submit">Publish answer</button>
        </form>
      ))}
    </div>
  );
}
