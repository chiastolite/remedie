use strict;
use t::TestPlagger;

test_requires_network 'mininova.org';
test_requires_network 'veoh.com';
plan 'no_plan';
run_eval_expected;

__END__

===
--- input config
plugins:
  - module: Subscription::Config
    config:
      feed:
        - http://www.mininova.org/search/?search=test
        - http://www.mininova.org/search/test/1
  - module: Discovery::Sites

--- expected
is $context->subscription->feeds->[0]->url, "http://www.mininova.org/rss/test";
is $context->subscription->feeds->[1]->url, "http://www.mininova.org/rss/test/1";

===
--- input config
plugins:
  - module: Subscription::Config
    config:
      feed:
        - http://www.veoh.com/search.html?type=v&search=obama
  - module: Discovery::Sites

--- expected
like $context->subscription->feeds->[0]->entries->[0]->link, qr|http://www.veoh.com/videos|;
ok $context->subscription->feeds->[0]->entries->[0]->thumbnail->{url};

===
--- input config
plugins:
  - module: Subscription::Config
    config:
      feed:
        - http://www.apple.com/trailers/home/xml/current_720p.xml
  - module: Discovery::Sites

--- expected
like $context->subscription->feeds->[0]->entries->[0]->enclosures->[0]->url, qr/720p.mov/;
