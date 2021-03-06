# author: Tatsuhiko Miyagawa
use XML::LibXML;
sub init {
    my $self = shift;
    $self->{handle} = "\.asx"; # XXX this really needs to be the handle for upgrade, not find
}


sub find { }

sub upgrade {
    my($self, $args) = @_;

    my $enclosure = $args->{enclosure};
    return unless $enclosure->type eq 'video/x-ms-asf' && $enclosure->url =~ m!^http://!;

    my $content = $self->parent->fetch_content($enclosure->url)
        or return;

    my $doc = eval { XML::LibXML->new->parse_string($content) } or return;
    my @ref = map $doc->findnodes("//$_"), qw( ref Ref REF )
        or return;

    my $url = $ref[0]->getAttribute('href') || $ref[0]->getAttribute('HREF')
        or return;
    $enclosure->url($url);
    $enclosure->type(Plagger::Util::mime_type_of($url) || "video/x-ms-asf");

    Plagger->context->log(info => "Enclosure upgraded to $url " . $enclosure->type);
}

