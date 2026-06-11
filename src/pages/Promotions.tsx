import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Megaphone, Sparkles } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import cashewLogo from '@/assets/cashew-logo.png';

type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  cta_label: string | null;
  cta_view: string | null;
  published_at: string;
};

const Promotions = () => {
  const [user, setUser] = useState<User | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const loadPromotions = async () => {
      setLoading(true);
      setError(null);

      const { data, error: promotionsError } = await supabase
        .from('promotions')
        .select('id, title, subtitle, body, cta_label, cta_view, published_at')
        .order('published_at', { ascending: false });

      if (promotionsError) {
        console.warn('Promotions load failed:', promotionsError);
        setError('Promotions are unavailable right now.');
        setPromotions([]);
      } else {
        setPromotions(data ?? []);
      }

      setLoading(false);
    };

    void loadPromotions();
  }, [user]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handlePromoAction = (promotion: Promotion) => {
    if (promotion.cta_view) {
      navigate('/dashboard', { state: { view: promotion.cta_view } });
      return;
    }

    handleContinue();
  };

  if (!user) return null;

  const featuredPromotion = promotions[0];
  const otherPromotions = promotions.slice(1);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={cashewLogo} alt="Cashew Logo" className="h-9 w-auto" />
            <div>
              <div className="font-semibold leading-none">Cashew</div>
              <div className="text-xs text-muted-foreground">
                Make Your Dream Come True!
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={handleContinue}>
            Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[1.1fr_0.9fr] md:px-6 md:py-8">
        <section className="rounded-lg border bg-background p-6 shadow-soft md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge className="rounded-md bg-primary text-primary-foreground hover:bg-primary">
              New promotions
            </Badge>
            <span className="text-sm text-muted-foreground">
              Latest offer appears first
            </span>
          </div>

          {loading && (
            <div className="py-20 text-center text-muted-foreground">
              Loading promotions...
            </div>
          )}

          {!loading && error && (
            <div className="py-20 text-center">
              <p className="mb-4 text-muted-foreground">{error}</p>
              <Button onClick={handleContinue}>Continue to dashboard</Button>
            </div>
          )}

          {!loading && !error && !featuredPromotion && (
            <div className="py-20 text-center">
              <p className="mb-4 text-muted-foreground">
                No promotions are active right now.
              </p>
              <Button onClick={handleContinue}>Continue to dashboard</Button>
            </div>
          )}

          {!loading && !error && featuredPromotion && (
            <div className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
                  {featuredPromotion.title}
                </h1>

                {featuredPromotion.subtitle && (
                  <p className="text-lg text-muted-foreground">
                    {featuredPromotion.subtitle}
                  </p>
                )}

                <p className="max-w-2xl text-base leading-7 text-foreground/80">
                  {featuredPromotion.body}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => handlePromoAction(featuredPromotion)}>
                  {featuredPromotion.cta_label || 'Learn more'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleContinue}>
                  Not now
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            More offers
          </div>

          {!loading && otherPromotions.length === 0 && (
            <Card className="rounded-lg shadow-soft">
              <CardContent className="p-5 text-sm text-muted-foreground">
                You are all caught up.
              </CardContent>
            </Card>
          )}

          {otherPromotions.map((promotion) => (
            <Card key={promotion.id} className="rounded-lg shadow-soft">
              <CardContent className="space-y-3 p-5">
                <div>
                  <h2 className="font-semibold text-foreground">
                    {promotion.title}
                  </h2>
                  {promotion.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {promotion.subtitle}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePromoAction(promotion)}
                >
                  {promotion.cta_label || 'View'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </aside>
      </main>
    </div>
  );
};

export default Promotions;
